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

    public AllergenCatalogLoader() {}

    @jakarta.annotation.PostConstruct
    public void load() {
        try (InputStream is = allergenCatalogResource.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            Map<String, List<String>> map = new HashMap<>();

            Iterator<String> countryCodes = root.fieldNames();
            while (countryCodes.hasNext()) {
                String code = countryCodes.next();
                JsonNode countryNode = root.get(code);
                JsonNode allergens = countryNode.get("allergens");
                if (allergens == null || !allergens.isArray()) continue;

                List<String> names = new ArrayList<>();
                for (JsonNode a : allergens) {
                    JsonNode nameNode = a.get("name");
                    if (nameNode != null) names.add(nameNode.asText());
                }
                map.put(code.toUpperCase(Locale.ROOT), names);
            }

            this.countryToAllergens = map;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load allergen catalog from " + allergenCatalogResource, e);
        }
    }
}
