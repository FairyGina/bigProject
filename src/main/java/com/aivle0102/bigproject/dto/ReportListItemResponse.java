package com.aivle0102.bigproject.dto;

import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.Recipe;
import lombok.AllArgsConstructor;
import lombok.Getter;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Base64;

@Getter
@AllArgsConstructor
public class ReportListItemResponse {
    private Long reportId;
    private Long recipeId;
    private String recipeTitle;
    private String recipeImageBase64;
    private String summary;
    private String reportType;
    private String reportOpenYn;
    private LocalDateTime createdAt;

    public static ReportListItemResponse from(MarketReport report) {
        Recipe recipe = report == null ? null : report.getRecipe();
        String originalImage = recipe == null ? null : recipe.getImageBase64();
        String resizedImage = resizeImageIfNeeded(originalImage);

        return new ReportListItemResponse(
                report == null ? null : report.getId(),
                recipe == null ? null : recipe.getId(),
                recipe == null ? null : recipe.getRecipeName(),
                resizedImage,
                report == null ? null : report.getSummary(),
                report == null ? null : report.getReportType(),
                report == null ? null : report.getOpenYn(),
                report == null ? null : report.getCreatedAt());
    }

    private static String resizeImageIfNeeded(String originalBase64) {
        if (originalBase64 == null || originalBase64.isBlank()) {
            return null;
        }
        // If smaller than 100KB, return as is to save CPU
        if (originalBase64.length() < 100 * 1024) {
            return originalBase64;
        }

        try {
            String base64Data = originalBase64;
            if (originalBase64.contains(",")) {
                String[] parts = originalBase64.split(",");
                base64Data = parts[1];
            }

            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            ByteArrayInputStream bis = new ByteArrayInputStream(imageBytes);
            BufferedImage originalImage = ImageIO.read(bis);

            if (originalImage == null) {
                return originalBase64;
            }

            int targetWidth = 300; // Thumbnail width
            if (originalImage.getWidth() <= targetWidth) {
                return originalBase64;
            }

            int targetHeight = (int) (originalImage.getHeight() * ((double) targetWidth / originalImage.getWidth()));
            BufferedImage resizedImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = resizedImage.createGraphics();
            g.drawImage(originalImage, 0, 0, targetWidth, targetHeight, null);
            g.dispose();

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            ImageIO.write(resizedImage, "jpg", bos); // Convert to JPEG for size
            String resizedBase64 = Base64.getEncoder().encodeToString(bos.toByteArray());

            return "data:image/jpeg;base64," + resizedBase64;
        } catch (Exception e) {
            // In case of any error, fallback to original
            System.err.println("Image resizing failed: " + e.getMessage());
            return originalBase64;
        }
    }
}
