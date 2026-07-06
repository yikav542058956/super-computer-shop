import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import cashfreeRouter from "./cashfree";
import groqRouter from "./groq";
import leadsRouter from "./leads";
import gmapsRouter from "./gmaps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cashfreeRouter);
router.use(groqRouter);
router.use(proxyRouter);
router.use(leadsRouter);
router.use(gmapsRouter);

export default router;
