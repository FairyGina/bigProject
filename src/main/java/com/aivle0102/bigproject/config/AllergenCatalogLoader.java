// 국가별 알레르기 의무 표기 목록을 로딩해 제공한다.
// 국가명/규정 문구도 함께 관리한다.
package com.aivle0102.bigproject.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
public class AllergenCatalogLoader {

    @Value("${allergen.catalog-path}")
    private Resource allergenCatalogResource;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // countryCode -> canonical allergen names (e.g., "US" -> ["Milk","Egg",...])
    @Getter
    private Map<String, List<String>> countryToAllergens = new HashMap<>();

    // countryCode -> country display name
    @Getter
    private Map<String, String> countryToName = new HashMap<>();

    // countryCode -> legal basis list
    @Getter
    private Map<String, List<String>> countryToLegalBasis = new HashMap<>();

    // gluten cereals reference list (e.g., Wheat, Barley, Rye, Oats, Kamut)
    @Getter
    private List<String> glutenCereals = new ArrayList<>();

    public AllergenCatalogLoader() {}

    @jakarta.annotation.PostConstruct
    public void load() {
        try (InputStream is = allergenCatalogResource.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            Map<String, List<String>> map = new HashMap<>();
            Map<String, String> countryNames = new HashMap<>();
            Map<String, List<String>> basisMap = new HashMap<>();

            JsonNode glutenNode = root.get("gluten_cereals");
            if (glutenNode != null && glutenNode.isArray()) {
                List<String> gluten = new ArrayList<>();
                for (JsonNode item : glutenNode) {
                    JsonNode nameNode = item.get("name");
                    if (nameNode != null) gluten.add(nameNode.asText());
                }
                this.glutenCereals = gluten;
            } else {
                this.glutenCereals = List.of();
            }

            Iterator<String> countryCodes = root.fieldNames();
            while (countryCodes.hasNext()) {
                String code = countryCodes.next();
                if ("gluten_cereals".equalsIgnoreCase(code)) continue;
                JsonNode countryNode = root.get(code);
                JsonNode countryNameNode = countryNode.get("country_name");
                if (countryNameNode != null) {
                    countryNames.put(code.toUpperCase(Locale.ROOT), countryNameNode.asText());
                }

                JsonNode allergens = countryNode.get("allergens");
                if (allergens == null || !allergens.isArray()) continue;

                List<String> allergenNames = new ArrayList<>();
                Set<String> bases = new LinkedHashSet<>();
                for (JsonNode a : allergens) {
                    JsonNode nameNode = a.get("name");
                    if (nameNode != null) allergenNames.add(nameNode.asText());

                    JsonNode basisNode = a.get("legal_basis");
                    if (basisNode != null) bases.add(basisNode.asText());
                }
                map.put(code.toUpperCase(Locale.ROOT), allergenNames);
                basisMap.put(code.toUpperCase(Locale.ROOT), new ArrayList<>(bases));
            }

            this.countryToAllergens = map;
            this.countryToName = countryNames;
            this.countryToLegalBasis = basisMap;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load allergen catalog from " + allergenCatalogResource, e);
        }
    }
}
