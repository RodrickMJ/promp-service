import app from "./app.js";
import "dotenv/config";

const port = process.env.PORT || 3004;

app.listen(port, () => {
    console.log("corriendo en puerto", port);
});
