import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  requireBoardAccess,
  requireEditAccess,
} from "../middleware/whiteboardAccess.js";
import * as board from "../controllers/whiteboardController.js";
import * as element from '../controllers/elementController.js'
import { uploadImage } from "../middleware/upload.js";
import * as uploadController from '../controllers/uploadController.js'
import * as aiController from '../controllers/aiController.js'

const router = express.Router();

router.use(requireAuth);

router.get("/", board.listBoards);
router.post("/", board.createBoard);

router.get("/:boardId", requireBoardAccess, board.getBoard);
router.patch("/:boardId", requireBoardAccess, requireEditAccess, board.updateBoard);
router.delete("/:boardId", requireBoardAccess, board.deleteBoard);

router.post("/:boardId/members", requireBoardAccess, board.addMember);
router.delete("/:boardId/members/:userId", requireBoardAccess, board.removeMember);

router.post('/:boardId/uploads',requireBoardAccess, requireEditAccess, uploadImage, uploadController.uploadImage)

router.post("/:boardId/elements", requireBoardAccess, requireEditAccess, element.createElement);
router.post("/:boardId/elements/bulk", requireBoardAccess, requireEditAccess, element.bulkCreate);
router.patch("/:boardId/elements/:elementId", requireBoardAccess, requireEditAccess, element.updateElement);
router.delete("/:boardId/elements/:elementId", requireBoardAccess, requireEditAccess, element.deleteElement);


router.post("/:boardId/ai/brainstorm", requireBoardAccess, requireEditAccess, aiController.brainstorm);
router.post("/:boardId/ai/outline", requireBoardAccess, requireEditAccess, aiController.outline);
router.post("/:boardId/ai/diagram", requireBoardAccess, requireEditAccess, aiController.diagram);
router.post("/:boardId/ai/chart", requireBoardAccess, requireEditAccess, aiController.chart);
router.post("/:boardId/ai/edit", requireBoardAccess, requireEditAccess, aiController.editSelection);
router.post("/:boardId/ai/summary", requireBoardAccess, aiController.summary);

export default router;