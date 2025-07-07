# Simple Hello World - Nucleus Example Project

This is a basic example project that demonstrates nucleus YAML configuration and deployment functionality.

## What This Example Does

1. **Collects User Input** via a dynamically generated form:
   - User's name for greeting
   - Greeting style (friendly, formal, enthusiastic)
   - Whether to include timestamp
   - Output location (current, temp, or home directory)
   - Output filename
   - Whether to check for required file

2. **Validates Requirements**:
   - Checks for the existence of `required-file.txt` if requested
   - Validates all form inputs

3. **Generates Output**:
   - Creates a personalized greeting file
   - Includes deployment metadata
   - Logs deployment activity

## Files Included

- `nucleus-config.yaml` - Main configuration defining the UI and deployment
- `deploy.sh` - Deployment script that creates the greeting
- `required-file.txt` - Example file that deployment checks for
- `README.md` - This documentation

## How to Test

### Option 1: Local Folder Loading
1. In nucleus, choose "Load Local Project"
2. Select this `simple-hello-world` folder
3. Fill out the generated form
4. Click deploy

### Option 2: Git Repository (if pushed to repo)
1. In nucleus, choose "Clone Repository" 
2. Enter the repository URL containing this project
3. Follow the same steps as above

## Expected Output

After successful deployment, you'll find:

1. **Greeting File**: Created in your chosen location with personalized content
2. **Deployment Log**: In nucleus output directory (`~/.nucleus/deployments/deployment.log`)
3. **Console Output**: Detailed deployment progress in nucleus logs

## Example Output File Content

```
Hello there, Alice! 👋

Generated at: 2024-01-15 14:30:22

---
Deployment Information:
- Project: Simple Hello World Deployer
- Nucleus Version: 1.0.0
- Deployed from: /path/to/project
- Output directory: /home/user/.nucleus/deployments
- User selections:
  * Greeting Style: friendly
  * Include Timestamp: true
  * Output Location: current directory
```

## Learning Points

This example demonstrates:

- ✅ YAML configuration structure
- ✅ Multiple field types (text, dropdown, checkbox)
- ✅ Default values and validation
- ✅ Environment variable usage in scripts
- ✅ File existence checking
- ✅ Dynamic output based on user selections
- ✅ Logging and error handling
- ✅ Nucleus special variables

## Customization

Feel free to modify this example to learn more about nucleus:

1. **Add new field types** (password, number)
2. **Implement conditional fields** with `required_if`
3. **Add template files** in a `templates/` directory
4. **Extend the deployment script** with more functionality
5. **Experiment with different logging events**