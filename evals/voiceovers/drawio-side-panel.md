# drawio-side-panel — Create and keep editing diagrams inside OpenWork

The existing Draw.io MCP and skill remain responsible for diagram generation and synchronization. OpenWork provides the embedded workspace and session lifecycle.

1. I am working on a project in OpenWork. I click the Draw.io button in the right-hand tool rail, and the editor opens directly in the side panel while my conversation stays visible.

2. I ask the agent to generate a system architecture diagram from the current workspace. The diagram appears in the right-hand canvas as the agent works, without opening an external browser window.

3. I drag a node and change its label directly in the canvas. The panel shows that my manual edit is synchronized and is now part of the current diagram state.

4. I ask the agent to keep my adjustment, add a cache layer, and tidy the connectors. The agent works from the latest diagram state, and my manual label and position remain intact.

5. I close the Draw.io panel and continue working. When I open it again, the same diagram session returns, ready to save as a `.drawio` file in the workspace or open externally.
