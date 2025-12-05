
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import analysisRoutes from "./routes/analysis.routes";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/analysis", analysisRoutes);


const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log("corriendo en puerto", port);
});
