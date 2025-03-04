import pandas as pd
import re

# Define file path
generated_questions_path = r"C:\Users\sunda\OneDrive\Desktop\image_to_text(question tagging)\already_given_dataset\generated_questions.csv"

# Load dataset
generated_df = pd.read_csv(generated_questions_path)

# Function to extract question tag
def extract_question_tag(sentence):
    match = re.match(r"^(\S+)", sentence)  # Extract the first token (word-like pattern)
    return match.group(1) if match else None

# Apply function to extract tags
generated_df["Detected_Tag"] = generated_df["Generated_Questions"].apply(extract_question_tag)

# Get unique tags with positions
tag_positions = {}
for index, row in generated_df.iterrows():
    tag = row["Detected_Tag"]
    if tag:
        if tag not in tag_positions:
            tag_positions[tag] = []
        tag_positions[tag].append(index + 1)  # Store row number (1-based index)

# Print unique tags and their positions
print("Unique Question Tags and Their Positions:")
for tag, positions in tag_positions.items():
    print(f"{tag}: Found at rows {positions}")
