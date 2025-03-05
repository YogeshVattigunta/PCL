import cv2
import numpy as np
import matplotlib.pyplot as plt

def preprocess_image(image_path):
    """Loads and preprocesses the image for document scanning."""
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    return image, edged

def find_document_contour(edged):
    """Finds the largest quadrilateral in the image."""
    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for contour in contours:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            return approx
    return None

def draw_contour(image, contour):
    """Draws the detected contour on the image."""
    if contour is not None:
        cv2.drawContours(image, [contour], -1, (0, 255, 0), 3)
    return image

# Load and process the image
image_path = "sample1.jpg"
image, edged = preprocess_image(image_path)

# Detect document border
document_contour = find_document_contour(edged)

# Draw the detected border
result = draw_contour(image.copy(), document_contour)

# Display using Matplotlib
plt.figure(figsize=(10, 6))
plt.imshow(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))
plt.axis("off")
plt.title("Scanned Document Border Detection")
plt.show()
