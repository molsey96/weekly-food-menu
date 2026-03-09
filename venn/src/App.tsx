import { VennDiagram } from "./VennDiagram"

function App() {
  return (
    <div
      style={{
        minHeight: "200vh",
        background: "#faf8f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 32px 200px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ width: 800, maxWidth: "100%" }}>
        <VennDiagram />
      </div>
    </div>
  )
}

export default App
