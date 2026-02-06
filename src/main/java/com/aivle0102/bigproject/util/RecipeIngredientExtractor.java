// 레시피 문장에서 재료 후보를 정제/추출하는 유틸리티.
// 수량·단위·수식어를 제거해 핵심 재료 토큰만 남긴다.
package com.aivle0102.bigproject.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public class RecipeIngredientExtractor {

    // 숫자/단위/괄호/수식어 제거 후 재료명만 남기기
    private static final Pattern PAREN = Pattern.compile("\\([^)]*\\)");
    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[\\./]\\d+)?");
    private static final Pattern UNITS = Pattern.compile(
            "(?i)\\b(g|kg|mg|ml|l|tbsp|tsp|cup|cups)\\b|"
                    + "(큰술|작은술|술|스푼|숟가락|티스푼|테이블스푼|컵|개|마리|모|쪽|줌|꼬집|팩|봉지|캔|포기|줄기|잎|알|통|덩이|조각|토막|한줌|적당량|약간)"
    );

    public static List<String> extractIngredients(String recipeText) {
        // 쉼표 기준으로 토큰을 분리한 뒤 재료명만 추출
        if (recipeText == null || recipeText.isBlank()) return List.of();

        String[] tokens = recipeText.split(",");
        Set<String> result = new LinkedHashSet<>();

        for (String token : tokens) {
            String name = cleanIngredientToken(token);
            if (!name.isEmpty()) result.add(name);
        }
        return new ArrayList<>(result);
    }
    
    private static String cleanIngredientToken(String token) {
        // 숫자/단위/수식어 제거 후 마지막 토큰을 재료명으로 사용
        if (token == null) return "";
        String t = token.trim();
        if (t.isEmpty()) return "";

        t = PAREN.matcher(t).replaceAll(" ");
        t = NUMBER.matcher(t).replaceAll(" ");
        t = UNITS.matcher(t).replaceAll(" ");
        t = t.replaceAll("[^\\p{L}\\s]", " ");
        t = t.replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) return "";
        String[] parts = t.split("\\s+");
        if (parts.length == 0) return "";
        return parts[parts.length - 1];
    }
}