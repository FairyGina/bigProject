package com.aivle0102.bigproject.util;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RecipeIngredientExtractor {

    // "고추장 20g", "간장 10ml" 같은 토큰에서 앞부분(재료명)만 뽑기
    // - 단위/숫자/괄호 제거
    // - 쉼표 기준 분리
    private static final Pattern LEADING_NAME = Pattern.compile("^\\s*([가-힣a-zA-Z]+)\\s*.*$");

    public static List<String> extractIngredients(String recipeText) {
        if (recipeText == null || recipeText.isBlank()) return List.of();

        String[] tokens = recipeText.split(",");
        Set<String> result = new LinkedHashSet<>();

        for (String token : tokens) {
            String t = token.trim();
            if (t.isEmpty()) continue;

            // 괄호 내용 제거(선택)
            t = t.replaceAll("\\(.*?\\)", "").trim();

            Matcher m = LEADING_NAME.matcher(t);
            if (m.matches()) {
                String name = m.group(1).trim();
                if (!name.isEmpty()) result.add(name);
            }
        }
        return new ArrayList<>(result);
    }
}
