import { Project, Performer, Plan } from '@/types';

const STORAGE_KEY = 'beauty-road-projects';

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
  const project: Project = {
    ...projectData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  
  return project;
}

export function updateProject(projectId: string, updates: Partial<Project>): Project | null {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  saveProjects(projects);
  return projects[index];
}

export function getProject(projectId: string): Project | null {
  const projects = getProjects();
  return projects.find(p => p.id === projectId) || null;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}