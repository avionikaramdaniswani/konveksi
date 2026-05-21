import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import chatbotRouter from "./chatbot";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentRouter);
router.use(chatbotRouter);
router.use(usersRouter);

export default router;
