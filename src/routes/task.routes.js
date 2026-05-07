const express = require('express');
const {
  listTasks, createTask, getTask, updateTask, deleteTask, addComment, listComments,
} = require('../controllers/task.controller');
const { authenticate, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');
const { validate, createTaskSchema, updateTaskSchema, createCommentSchema } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireProjectAccess);

router.get('/', listTasks);
router.post('/', requireProjectAdmin, validate(createTaskSchema), createTask);

router.get('/:taskId', getTask);
router.put('/:taskId', validate(updateTaskSchema), updateTask);
router.delete('/:taskId', requireProjectAdmin, deleteTask);

router.post('/:taskId/comments', validate(createCommentSchema), addComment);
router.get('/:taskId/comments', listComments);

module.exports = router;
