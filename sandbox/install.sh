#!/usr/bin/env bash
set -euo pipefail

# Colors
g="\033[32m" # Green
y="\033[33m" # Yellow
b="\033[34m" # Blue
p="\033[35m" # Purple
r="\033[0m"  # Reset
bold="\033[1m"

export DOCKER_CLI_HINTS=false

if [ ! -t 0 ]; then
  NON_INTERACTIVE=1
else
  NON_INTERACTIVE=${NON_INTERACTIVE:-0}
fi

AZTEC_PATH=$HOME/.aztec
BIN_PATH=${BIN_PATH:-$AZTEC_PATH/bin}

# Define version if specified, otherwise set to "latest".
VERSION=${VERSION:-"latest"}
INSTALL_URI=${INSTALL_URI:-https://install.aztec.network}
if [ "$VERSION" != "latest" ]; then
  INSTALL_URI+="/$VERSION"
fi

# Print text in green.
function info {
  echo -e "${g}$1${r}"
}

# Print text in yellow.
function warn {
  echo -e "${y}$1${r}"
}

# Copy a file from the install source path to the bin path and make it executable.
function install_bin {
  local dest="$BIN_PATH/$1"
  curl -fsSL "$INSTALL_URI/$1" -o "$dest"
  chmod +x "$dest"
  echo "Installed: $dest"
}

# Updates appropriate shell script to ensure the bin path is in the PATH.
function update_path_env_var {
  TARGET_DIR="${1}"
  # Check if the target directory is in the user's PATH.
  if [[ ":$PATH:" != *":$TARGET_DIR:"* ]]; then
    # Determine the user's shell.
    SHELL_PROFILE=""
    case $SHELL in
    */bash)
      SHELL_PROFILE="$HOME/.bash_profile"
      ;;
    */zsh)
      SHELL_PROFILE="$HOME/.zshrc"
      ;;
    # Add other shells as needed
    *)
      echo "Unsupported shell: $SHELL"
      return
      ;;
    esac

    if [ "$NON_INTERACTIVE" -eq 0 ]; then
      # Inform the user about the change and ask for confirmation
      warn "The directory $TARGET_DIR is not in your PATH."
      read -p "Add it to $SHELL_PROFILE to make the aztec binaries accessible? (y/n)" -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Skipped updating PATH. You might need to add $TARGET_DIR to your PATH manually to use the binary."
        return
      fi
    fi

    # Add the target directory to the user's PATH in their profile.
    echo "export PATH=\"\$PATH:$TARGET_DIR\"" >>"$SHELL_PROFILE"

    if [ "$NON_INTERACTIVE" -eq 0 ] && [ "${NO_NEW_SHELL:-0}" -eq 0 ]; then
      info "Done! Starting fresh shell..."
      exec $SHELL
    fi
  fi
}

info "Installing scripts in $BIN_PATH..."
rm -rf $BIN_PATH && mkdir -p $BIN_PATH
install_bin .aztec-run
install_bin aztec
install_bin aztec-up
install_bin aztec-nargo
install_bin aztec-wallet

update_path_env_var $BIN_PATH

info "Done!"
