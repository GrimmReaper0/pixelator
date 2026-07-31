# Anima Turbo workflow setup

Pixelator does not ship model weights or assume one exact custom-node graph.

1. Build and test an Anima Turbo workflow in your own ComfyUI installation.
2. Add IP-Adapter/reference-image nodes only when character consistency is needed.
3. Choose **Save (API Format)** and save the JSON here as `workflow.api.json`.
4. Copy `bindings.example.json` to `bindings.json`.
5. Replace the example node IDs and input fields with those from the exported workflow.
6. Run `npm run dev` and use the Anima queue panel.

The bridge replaces only declared inputs. It does not install nodes, download models, rewire the graph, or approve output automatically. The reference-image value should be a filename accepted by the configured ComfyUI loader node.
