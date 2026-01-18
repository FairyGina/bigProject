package com.aivle0102.bigproject.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class RawProduceCatalogLoader {

    // 원재료성 식품 CSV 경로(기본값: resources/data/raw_produce_catalog.csv)
    @Value("${raw-produce.catalog-path:classpath:data/raw_produce_catalog.csv}")
    private Resource catalogResource;

    // 원재료성 식품 사전(식품명/대표식품명/중분류/소분류 포함)
    @Getter
    private final Set<String> rawProduceNames = new HashSet<>();

    @jakarta.annotation.PostConstruct
    public void load() {
        // CSV에서 "원재료성 식품"만 필터링해 사전 구축
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(catalogResource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) return;

            List<String> headerCols = splitCsvLine(header);
            int nameIdx = headerCols.indexOf("식품명");
            int typeIdx = headerCols.indexOf("데이터구분명");
            int repIdx = headerCols.indexOf("대표식품명");
            int midIdx = headerCols.indexOf("식품중분류명");
            int subIdx = headerCols.indexOf("식품소분류명");
            if (nameIdx < 0 || typeIdx < 0) return;

            String line;
            while ((line = reader.readLine()) != null) {
                List<String> cols = splitCsvLine(line);
                if (cols.size() <= Math.max(nameIdx, typeIdx)) continue;

                String type = cols.get(typeIdx).trim();
                if (!"원재료성 식품".equals(type)) continue;

                // 관련 컬럼 값들을 모두 사전에 추가
                addIfNotBlank(cols, nameIdx);
                addIfNotBlank(cols, repIdx);
                addIfNotBlank(cols, midIdx);
                addIfNotBlank(cols, subIdx);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load raw produce catalog from " + catalogResource, e);
        }
    }

    public boolean isRawProduce(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return false;
        return rawProduceNames.contains(ingredientName.trim());
    }

    // 컬럼 인덱스가 유효하고 값이 비어있지 않으면 사전에 추가
    private void addIfNotBlank(List<String> cols, int idx) {
        if (idx < 0 || idx >= cols.size()) return;
        String value = cols.get(idx).trim();
        if (!value.isEmpty()) {
            rawProduceNames.add(value);
        }
    }

    // 따옴표 포함 CSV 한 줄을 안전하게 분리
    private List<String> splitCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                out.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        out.add(current.toString());
        return out;
    }
}
