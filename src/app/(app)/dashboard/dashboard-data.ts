import { projectRepository } from '@/lib/db/repositories';

type DashboardRepository = Pick<typeof projectRepository, 'listProjectsForUser'>;

export async function loadDashboardData(
  userId: string,
  repository: DashboardRepository = projectRepository,
) {
  try {
    const projects = await repository.listProjectsForUser(userId);
    return {
      projects,
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
