import { projectRepository } from '@/lib/db/repositories';

type DashboardRepository = Pick<typeof projectRepository, 'listProjectsForUser'>;

export async function loadDashboardData(
  userId: string,
  repository: DashboardRepository = projectRepository,
) {
  try {
    const projects = await repository.listProjectsForUser(userId);
    return {
      // P-U3-01: dashboard lists newest activity first.
      projects: [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
      dataAvailable: true,
    };
  } catch (error) {
    console.error('Dashboard data fallback activated', error);
    return {
      projects: [],
      dataAvailable: false,
    };
  }
}
