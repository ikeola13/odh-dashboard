# Running Language Model Evaluation (LM-Eval) with Open Data Hub (ODH) Integration

This guide outlines how to run the upstream LM-Eval micro-frontend and integrate it with a local Open Data Hub (ODH) development environment.

## Prerequisites

1.  **Start the ODH Backend:**
    Ensure your ODH backend server is running. Navigate to the `backend` directory within your main Open Data Hub dashboard project and run:

    ```bash
    npm run start:dev
    ```

2.  **Start the ODH Frontend:**
    The main ODH dashboard frontend application must also be running. Navigate to the main Open Data Hub dashboard project root and run:
    ```bash
    npm run start:dev
    ```
    **Important:** Do not use `npm run start:dev:ext` for the ODH frontend when testing this upstream integration.

## LM-Eval Setup

For detailed instructions on how to run the LM-Eval micro-frontend itself (covering local deployment, development, etc.), please refer to the official [LM-Eval Documentation](./upstream/README.md).

## ODH Integration Point

The integration of this upstream LM-Eval with Open Data Hub is managed via plugin extensions. The primary extension definitions for this integration can be found in:
[./upstream/frontend/src/odh/extensions.ts](./upstream/frontend/src/odh/extensions.ts)

This file declares how the LM-Eval UI components and routes are exposed to and loaded by the ODH dashboard.

## Testing the Integration

1. **Build the Micro-Frontend:**

   ```bash
   cd upstream/frontend
   npm install
   npm run build
   ```

2. **Start the ODH Dashboard:**

   ```bash
   # From the ODH dashboard root
   npm run start:dev
   ```

3. **Verify Integration:**
   - Look for "Language Model Evaluation" in the navigation under "Models" section
   - Navigate to `/lm-eval` to access the LM-Eval interface
   - Check browser console for any module federation errors

## Module Federation Configuration

The micro-frontend is configured to expose its extensions through module federation in:
[./upstream/frontend/config/moduleFederation.js](./upstream/frontend/config/moduleFederation.js)

This configuration defines how the LM-Eval components are shared and loaded by the main ODH dashboard.
