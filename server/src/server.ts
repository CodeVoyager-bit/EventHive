import app from "./index";
import Database from "./config/Database";
import Event from "./models/Event";

const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === "production") return;
  // Demo dates are relative to when the seed ran; after a few weeks they are all in the past
  try {
    await Database.getInstance().connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eventhive");
    if (!(await Event.exists({ status: "published", date: { $gte: new Date() } }))) {
      console.warn("No upcoming events in the database. Run `npm run seed` to refresh the demo data.");
    }
  } catch (err) {
    console.warn("Could not reach MongoDB:", (err as Error).message);
  }
});
