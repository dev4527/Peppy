const Project = require('../models/Project');
const User = require('../models/User');

const getUserId = (req) => req.user?.user?.id || req.user?.id || req.user?._id || null;

const sameTeam = (left, right) => (
  String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase()
);

const loadCurrentUser = async (req) => {
  const userId = getUserId(req);
  if (!userId) return null;
  return User.findById(userId);
};

const canManageProject = (user, project) => {
  if (!user || !project) return false;
  if (user.role === 'Admin') return true;
  return user.role === 'Manager' && (
    String(project.createdBy) === String(user._id) ||
    sameTeam(project.teamCategory, user.team)
  );
};

const canViewProject = (user, project) => {
  if (canManageProject(user, project)) return true;
  return Boolean(user && project && sameTeam(project.teamCategory, user.team));
};

const canViewTask = async (user, task) => {
  if (!user || !task) return false;
  if (user.role === 'Admin') return true;

  const project = task.project?.teamCategory
    ? task.project
    : await Project.findById(task.project);

  if (user.role === 'Manager') return canManageProject(user, project);

  return String(task.assignedTo?._id || task.assignedTo || '') === String(user._id) ||
    String(task.createdBy) === String(user._id);
};

const canEditTask = canViewTask;

const canAssignUser = async (actor, targetUserId) => {
  if (!targetUserId) return true;
  if (!actor) return false;
  if (actor.role === 'Admin') return true;
  if (actor.role === 'Employee' || actor.role === 'Team Member') {
    return String(actor._id) === String(targetUserId);
  }

  const target = await User.findById(targetUserId);
  if (!target) return false;

  return String(target.manager) === String(actor._id) || sameTeam(target.team, actor.team);
};

module.exports = {
  getUserId,
  loadCurrentUser,
  sameTeam,
  canManageProject,
  canViewProject,
  canViewTask,
  canEditTask,
  canAssignUser
};
