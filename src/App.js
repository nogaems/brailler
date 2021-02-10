import "./App.css";
import { Controls } from "./Controls";

const Header = () => {
  return (
    <header>
      <h3>Generate ASCII Art from a picture using Braille patterns</h3>
    </header>
  );
};

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer>
      &copy; Copyright {year} <strong>Not a Designer </strong>LLC.
    </footer>
  );
};

function App() {
  return (
    <div className="App">
      <Header />
      <Controls></Controls>
      <Footer />
    </div>
  );
}

export default App;
