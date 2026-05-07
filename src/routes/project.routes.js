const express = require('express');
const {
  listProjects, createProject, getProject,
  updateProject, deleteProject, addMember, removeMember,
} = require('../controllers/project.controller');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');
const { validate, createProjectSchema, updateProjectSchema, addMemberSchema } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.get('/', listProjects);
router.post('/', validate(createProjectSchema), createProject);

router.get('/:id', requireProjectAccess, getProject);
router.put('/:id', requireProjectAccess, requireProjectAdmin, validate(updateProjectSchema), updateProject);
router.delete('/:id', requireProjectAccess, requireProjectAdmin, deleteProject);

router.post('/:id/members', requireProjectAccess, requireProjectAdmin, validate(addMemberSchema), addMember);
router.delete('/:id/members/:userId', requireProjectAccess, requireProjectAdmin, removeMember);

module.exports = router;
