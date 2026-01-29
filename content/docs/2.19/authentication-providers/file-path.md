+++
title = "File path"
+++

You can read authentication parameters from files mounted in the KEDA operator pod using the `filePath` option. This feature requires the KEDA operator to be configured with a root path for file access.

## Security Constraints

The `filePath` feature has important security constraints:

- **Requires root path configuration** - The KEDA operator must be started with `--filepath-auth-root-path` to define the allowed directory
- **Path validation** - All file paths are validated to ensure they resolve within the configured root path, preventing access to sensitive system files like service account tokens
- **Relative paths** - The `filePath` in `ClusterTriggerAuthentication` is treated as a relative path under the configured root path

## Operator Configuration

The KEDA operator requires a command-line argument to enable file-based authentication:

```bash
--filepath-auth-root-path=/path/to/allowed/files
```

This path should point to a directory where credential files are mounted. The operator will only read files from within this directory.

## Example

First, ensure the KEDA operator has the root path configured. Then create a `ClusterTriggerAuthentication` referencing files:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: file-based-auth
spec:
  filePath:
    - parameter: apiKey           # Required - Defined by the scale trigger
      path: credentials/api-key   # Required - Path relative to filepath-auth-root-path
```

**Assumptions:**
- The path is relative to the `--filepath-auth-root-path` configured for the KEDA operator
- The credential file exists at `{filepath-auth-root-path}/credentials/api-key`
- The file contains the raw credential value (not JSON encoded)
- The file path should match the actual file name, including any extension if present (e.g., `credentials/api-key.txt` if the file is named `api-key.txt`)
