# Recipe Case API Notes

## Purpose
- Match recipe ingredients to export/import nonconforming cases using CSV data, then store results in the database.

## Data Sources
- Search CSV: `src/main/resources/data/recipe_inspection_basis_search.csv`
  - Columns: case_id, country, ingredient_keyword, ingredient_type
- Info CSV: `src/main/resources/data/regulatory_cases.csv`
  - Columns: case_id, country, announcement_date, ingredient, violation_reason, action

## Matching Rules
- Ingredient matching uses **exact token match** on whitespace-delimited tokens.
  - Tokenization: split by whitespace (punctuation becomes whitespace)
  - Multi-token ingredients must match as a contiguous token sequence
- Do not apply country filtering at this stage.
- Do not remove duplicates (keep all matched cases).

## API Design (Single Request)
- Use a dedicated API (independent controller).

### Request (confirmed)
```json
{ "recipe_id": 123, "recipe": "?쒗뭹紐? ?щ즺1, ?щ즺2, ?щ즺3" }
```

### Response (confirmed)
```json
{
  "product_cases": {
    "product": "?쒗뭹紐?",
    "cases": [
      {
        "case_id": "CASE_000101",
        "country": "??",
        "announcement_date": "2020. 1",
        "ingredient": "???-????",
        "violation_reason": "?? ??",
        "action": "??/??",
        "matched_ingredient": "??"
      }
    ]
  },
  "ingredient_cases": [
    {
      "ingredient": "?щ즺1",
      "cases": [
        {
          "case_id": "CASE_000202",
          "country": "??",
          "announcement_date": "2019. 7",
          "ingredient": "???-????",
          "violation_reason": "?? ??",
          "action": "??/??",
          "matched_ingredient": "??"
        }
      ]
    }
  ]
}
```

## Storage
- Save to existing table `recipe_nonconforming_case`.
- `matched_ingredient` records the CSV keyword that matched.

## Notes
- Internal code may split into functions, but API call remains single request.
- A second matching mode (finished product keyword) may be added later; consider adding a `match_type` field then.

## Current Implementation Status (2026-01-22)
- Controller + DTOs already exist and align with the confirmed request/response.
  - Controller: `src/main/java/com/aivle0102/bigproject/controller/RecipeCaseController.java`
  - Request DTO: `src/main/java/com/aivle0102/bigproject/dto/RecipeCaseRequest.java`
  - Response DTOs: `src/main/java/com/aivle0102/bigproject/dto/RecipeCaseResponse.java`,
    `src/main/java/com/aivle0102/bigproject/dto/IngredientCases.java`,
    `src/main/java/com/aivle0102/bigproject/dto/RegulatoryCase.java`
- Repository + Entity for storage already exist.
  - Entity: `src/main/java/com/aivle0102/bigproject/domain/RecipeNonconformingCase.java`
  - Repository: `src/main/java/com/aivle0102/bigproject/repository/RecipeNonconformingCaseRepository.java`
- Service interface exists: `src/main/java/com/aivle0102/bigproject/service/RecipeCaseService.java`
- Service implementation is updated and running: `src/main/java/com/aivle0102/bigproject/service/RecipeCaseServiceImpl.java`
  - CSV parsing for search CSV + info CSV implemented.
  - Matching logic + DB save implemented.

## Current API (2026-01-22) - Updated Flow
- Input switched to `recipe` string:
  - Format: `"제품명: 재료1, 재료2, 재료3"`
  - Example: `"김치볶음밥: 밥, 김치, 햄, 대파, 계란"`
- Parsing:
  - Product name = text before `:`
  - Ingredients = text after `:` split by comma
- Output is split into two sections:
  - `product_cases`: cases matched to the **product name**
  - `ingredient_cases`: cases matched to each **ingredient**

## DTO Changes (Applied)
- `RecipeCaseRequest`:
  - **Before**: `recipe_id`, `ingredients[]`
  - **Now**: `recipe_id`, `recipe` (String)
- New DTO:
  - `ProductCases` with fields `product`, `cases`
- `RecipeCaseResponse`:
  - **Now** has `product_cases` and `ingredient_cases`
- `IngredientCases` and `RegulatoryCase` remain, still used for case lists.

## DB Change (Applied)
- Table: `recipe_nonconforming_case`
- Added column: `match_type` (VARCHAR)
  - Values: `PRODUCT` or `INGREDIENT`
  - Used to separate product vs ingredient matches in DB

## Matching Rules (Updated)
- Product cases:
  - Product name matched against CSV keywords using **token overlap**
  - Tokenization: split by whitespace (punctuation becomes whitespace)
  - No length filter (1-char tokens allowed)
  - **Ingredient type filter removed** so RAW/FINISHED/PROCESSED all allowed
- Ingredient cases:
  - Matching uses **exact token match** on whitespace-delimited tokens
  - Tokenization: split by whitespace (punctuation becomes whitespace)
  - Multi-token ingredients must match as a contiguous token sequence
  - Type filter is **not applied**
- Country filtering: **not applied**
- Duplicates: **not removed**
- `matched_ingredient` stores the CSV keyword used for matching

## CSV Parsing Issue (Resolved)
- Error encountered: `Mapping for case_id not found`
- Cause: BOM (`﻿`) at start of CSV header in `recipe_inspection_basis_search.csv`
- Fix: save CSV as UTF-8 **without BOM**

## Current Implementation Notes
- Product matching uses `hasTokenOverlap(productName, ingredientKeyword)`.
- Ingredient matching uses `hasExactTokenMatch(ingredientKeyword, ingredient)`.
- DB save uses `match_type = PRODUCT` for product matches, `INGREDIENT` for ingredient matches.

## Known Behavior
- Product cases can include matches like "김치볶음밥" ↔ "김치" or "김"
  depending on token overlap.
- Ingredient cases may include many matches if ingredient is very short
  (e.g., "김"). This is acceptable for now.

## Input Guidance (Operational)
- To avoid product-name overmatching (e.g., "?? ??" matching both "??" and "??"),
  have users input the **core product name only** (e.g., "??").

## Potential Future Improvement (No LLM)
- Optionally add a rule-based filter:
  - blacklist/whitelist per ingredient
  - category mapping (ingredient vs finished product)
  - frequency-based suppression of noisy matches
