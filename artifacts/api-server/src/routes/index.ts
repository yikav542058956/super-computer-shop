import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import cashfreeRouter from "./cashfree";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashfreeRouter);
router.use(proxyRouter);

export default router;
