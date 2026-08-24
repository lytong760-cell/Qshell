import { FirebaseStorageConfig, GitHubStorageConfig, StorageDestinationType } from '../types';
import { vfsInstance } from './vfs';

const FIREBASE_CONFIG_KEY = 'qshell_firebase_config';
const GITHUB_CONFIG_KEY = 'qshell_github_config';
const STORAGE_DESTINATION_KEY = 'qshell_storage_destination';

export class CloudSyncService {
  private destination: StorageDestinationType = 'github';
  private firebaseConfig: FirebaseStorageConfig;
  private githubConfig: GitHubStorageConfig;
  private listeners: ((type: string, data: any) => void)[] = [];

  constructor() {
    this.destination = (localStorage.getItem(STORAGE_DESTINATION_KEY) as StorageDestinationType) || 'github';

    this.firebaseConfig = this.loadFirebaseConfig();
    this.githubConfig = this.loadGitHubConfig();
  }

  public subscribe(cb: (type: string, data: any) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(type: string, data: any) {
    this.listeners.forEach(cb => cb(type, data));
  }

  public getDestination(): StorageDestinationType {
    return this.destination;
  }

  public setDestination(dest: StorageDestinationType) {
    this.destination = dest;
    localStorage.setItem(STORAGE_DESTINATION_KEY, dest);
    this.notify('destination_changed', dest);
  }

  public getFirebaseConfig(): FirebaseStorageConfig {
    return { ...this.firebaseConfig };
  }

  public getGitHubConfig(): GitHubStorageConfig {
    return { ...this.githubConfig };
  }

  public updateFirebaseConfig(config: Partial<FirebaseStorageConfig>) {
    this.firebaseConfig = { ...this.firebaseConfig, ...config };
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(this.firebaseConfig));
    this.notify('firebase_config_updated', this.firebaseConfig);
  }

  public updateGitHubConfig(config: Partial<GitHubStorageConfig>) {
    this.githubConfig = { ...this.githubConfig, ...config };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(this.githubConfig));
    this.notify('github_config_updated', this.githubConfig);
  }

  public formatCommitMessage(template: string, variables: Record<string, string>): string {
    let msg = template;
    for (const [key, value] of Object.entries(variables)) {
      msg = msg.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return msg;
  }

  // Triggered on file change if auto-commit/auto-sync is on
  public async handleFileChange(filePath: string, action: 'created' | 'modified' | 'deleted') {
    if (this.destination === 'github' && this.githubConfig.enabled && this.githubConfig.autoCommitOnChange) {
      const fileName = filePath.split('/').pop() || filePath;
      const now = new Date().toISOString();
      const message = this.formatCommitMessage(this.githubConfig.commitMessageTemplate, {
        filename: fileName,
        filepath: filePath,
        action,
        timestamp: now,
        branch: this.githubConfig.branch,
        author: this.githubConfig.authorName,
      });

      await this.syncToGitHub(message, [filePath]);
    } else if (this.destination === 'firebase' && this.firebaseConfig.enabled && this.firebaseConfig.autoSync) {
      await this.syncToFirebase();
    }
  }

  public async syncToGitHub(customMessage?: string, specificFiles?: string[]): Promise<{ success: boolean; message: string; commitHash?: string }> {
    if (!this.githubConfig.token && !this.githubConfig.repo) {
      return {
        success: false,
        message: 'GitHub OAuth/Token or repository target is not configured. Please configure in Storage Settings.',
      };
    }

    this.updateGitHubConfig({ status: 'syncing' });

    try {
      const files = specificFiles 
        ? specificFiles.map(p => ({ path: p, content: vfsInstance.getFile(p)?.content || '' }))
        : vfsInstance.getAllFilesFlat();

      const commitMsg = customMessage || this.formatCommitMessage(this.githubConfig.commitMessageTemplate, {
        filename: 'workspace',
        filepath: '/root/workspace',
        action: 'sync',
        timestamp: new Date().toISOString(),
        branch: this.githubConfig.branch,
        author: this.githubConfig.authorName,
      });

      // Call our server-side GitHub sync proxy
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubConfig.token}`,
        },
        body: JSON.stringify({
          token: this.githubConfig.token,
          repo: this.githubConfig.repo,
          branch: this.githubConfig.branch || 'main',
          files,
          commitMessage: commitMsg,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.updateGitHubConfig({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
          lastCommitHash: result.commitHash,
        });
        return {
          success: true,
          message: `Synced ${files.length} file(s) to ${this.githubConfig.repo}:${this.githubConfig.branch}. Commit: ${result.commitHash}`,
          commitHash: result.commitHash,
        };
      } else {
        throw new Error(result.message || 'GitHub sync returned an error');
      }
    } catch (err: any) {
      this.updateGitHubConfig({ status: 'error' });
      return {
        success: false,
        message: err?.message || 'Failed to sync with GitHub',
      };
    }
  }

  public async syncToFirebase(): Promise<{ success: boolean; message: string }> {
    this.updateFirebaseConfig({ status: 'syncing' });

    try {
      const files = vfsInstance.getAllFilesFlat();
      const payload: Record<string, string> = {};
      files.forEach(f => {
        payload[f.path] = f.content;
      });

      const res = await fetch('/api/firebase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.firebaseConfig.projectId || 'qshell-default',
          collection: this.firebaseConfig.collection || 'workspaces',
          workspaceId: this.firebaseConfig.workspaceId || 'root-workspace',
          data: payload,
        }),
      });

      const result = await res.json();
      if (result.success) {
        this.updateFirebaseConfig({
          status: 'synced',
          lastSyncedAt: new Date().toISOString(),
        });
        return {
          success: true,
          message: `Workspace backed up to Firebase Firestore [${result.itemCount} files].`,
        };
      } else {
        throw new Error('Firebase sync failed');
      }
    } catch (e: any) {
      this.updateFirebaseConfig({ status: 'error' });
      return {
        success: false,
        message: e?.message || 'Failed to sync to Firebase remote storage',
      };
    }
  }

  private loadFirebaseConfig(): FirebaseStorageConfig {
    const defaultVal: FirebaseStorageConfig = {
      enabled: false,
      projectId: 'qshell-cloud-db-prod',
      databaseUrl: 'https://qshell-cloud-db-prod.firebaseio.com',
      collection: 'qshell_workspaces',
      workspaceId: 'dev_workspace_01',
      autoSync: true,
      status: 'idle',
    };

    try {
      const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
      return raw ? { ...defaultVal, ...JSON.parse(raw) } : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private loadGitHubConfig(): GitHubStorageConfig {
    const defaultVal: GitHubStorageConfig = {
      enabled: true,
      token: 'ghp_qshell_demo_token_authenticated',
      repo: 'user/qshell-workspace',
      branch: 'main',
      autoCommitOnChange: true,
      commitMessageTemplate: 'chore(qshell): update {filename} [{timestamp}]',
      authorName: 'Qshell User',
      authorEmail: 'developer@qshell.dev',
      status: 'idle',
    };

    try {
      const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
      return raw ? { ...defaultVal, ...JSON.parse(raw) } : defaultVal;
    } catch {
      return defaultVal;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
