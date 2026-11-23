import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import "./incomplete.css";

export function NotFound() {
  return (
    <>
      <Navbar />
      <div className="incomplete-text">
        <div>
          that page doesn't exist.{" "}
          <Link to="/" className="incomplete-link">back home</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
