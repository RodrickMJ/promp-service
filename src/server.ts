import app from "./app";
import "dotenv/config";

const port = process.env.PORT || 3004;

app.listen(port, () => {
    console.log("corriendo en puerto", port);
});
