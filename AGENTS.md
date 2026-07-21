# Simlab

Aware of `graphify-out/GRAPH_REPORT.md` for summary of the codebase

## Post-Implementation Protocol

Every time you finish implementing or modifying large chunks of code, you MUST execute the following steps sequentially:

### Rules

- Only when running instruction tasks with given markdown files
- For small refactoring and debugging don't run these Post Implementation Protocol

### Steps

1. **Run Terminal Commands:**
   Execute the following commands in the terminal to update the code structure map:
   `graphify update .`
   Then run:
   `graphify cluster-only /home/dwiwahyuilahi/Personal/Projects/FKG/simlab/simlab-fkg`

2. **Create a Summary of Changes:**
   _Create a new markdown report file inside the `/instruction-reports/` directory. The filename MUST exactly match the instruction filename..._
   Write the summary using the following format:

- **Modified Files:** (List of files)
- **Logic Changes:** (Briefly explain what was changed or added)
- **Impact on Graph:** (State whether there are new relationships between components)
