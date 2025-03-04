import cv2
import numpy as np
import matplotlib.pyplot as plt

def detect_document_border(image_path, output_path="document_border_output.jpg"):
    # Load image and convert to grayscale
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Apply Gaussian Blur and Canny Edge Detection
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 75, 200)  # Adjusted thresholds

    # Find contours and sort by area
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    document_contour = None
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if len(approx) == 4:  # Looking for a quadrilateral
            document_contour = approx
            break

    if document_contour is not None:
        cv2.drawContours(image, [document_contour], -1, (0, 255, 0), 2)
    else:
        print("No document-like contour found.")

    # Save and display result
    cv2.imwrite(output_path, image)
    plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    plt.axis("off")
    plt.show()
    print(f"Output saved as '{output_path}'")

# Example usage
detect_document_border("sample1.jpg")