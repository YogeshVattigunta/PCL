import cv2
import numpy as np
import matplotlib.pyplot as plt

def detect_document_border(image_path, output_path="document_border_output.jpg"):
    # Load image
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Image not found or cannot be read.")
        return
    
    # Convert to grayscale and enhance contrast
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)  # Improves contrast

    # Use Bilateral Filter to reduce noise while keeping edges
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)

    # Apply Otsu’s thresholding
    _, thresh = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Apply Morphological Closing to remove small holes
    kernel = np.ones((5, 5), np.uint8)
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Detect edges using Canny
    edges = cv2.Canny(closed, 50, 150)

    # Find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        print("No contours found.")
        return

    document_contour = None
    image_height, image_width = image.shape[:2]

    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        area = cv2.contourArea(contour)
        if area < 5000 or area > (image_width * image_height * 0.9):  
            continue  # Ignore small or oversized areas
        
        # Approximate contour to polygon
        epsilon = 0.05 * cv2.arcLength(contour, True)  # Looser approximation
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # Ensure it has four points (document-like shape)
        if len(approx) == 4:
            document_contour = approx
            break

    if document_contour is not None:
        cv2.drawContours(image, [document_contour], -1, (0, 255, 0), 2)
        cv2.imwrite(output_path, image)
        plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        plt.axis("off")
        plt.show()
        print(f"Output saved as '{output_path}'")
    else:
        print("No document-like contour found. Try increasing contrast or using a clearer image.")

# Example usage
detect_document_border("sample1.jpg")
detect_document_border("sample2.jpg")