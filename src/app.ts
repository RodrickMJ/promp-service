import express from "express";
import "dotenv/config";
import analysisRoutes from "./routes/analysis.routes.js";


const app = express();

app.use(express.json({ limit: "2mb" }));
app.use("/analysis", analysisRoutes);

export default app;


// import express from "express";
// import 'dotenv/config'
// import analysisRoutes from "./routes/analysis.routes";

// const app = express();
// app.use(express.json({ limit: "2mb" }));
// app.use("/analysis", analysisRoutes);

// const port = process.env.PORT || 3004;

// app.listen(port, () => {
//   console.log("corriendo en puerto", port);
// });
