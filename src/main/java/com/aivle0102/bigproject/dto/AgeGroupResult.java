package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AgeGroupResult {
    private String country;
    private String ageGroup;
    private String reason;
}
