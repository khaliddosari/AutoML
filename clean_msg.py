import sys

# Read the original commit message from standard input
message = sys.stdin.read()

# Filter out any lines that contain "anthropic"
clean_lines = [line for line in message.splitlines() if "anthropic" not in line]

# Output the cleaned message to standard output
sys.stdout.write("\n".join(clean_lines) + "\n")
