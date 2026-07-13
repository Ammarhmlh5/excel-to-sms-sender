import { createRoot } from "react-dom/client";
import AdminApp from "./AdminApp.tsx";
import "../shared/index.css";

createRoot(document.getElementById("root")!).render(<AdminApp />);
