# Compiled Analysis

This is a cumulative report derived from the experiments performed according to the [plan](../plan.md).

## Metrics and Variables

Metrics to look for:

1. Validity Percentage
2. Average Uniqueness Ratio
3. Avertage Complexity Scores
4. Highest Complexity Tier

Variables used:

1. Amount of Spells
2. Max Nesting Depth
3. Max Linking Depth
4. Normalization used

## Observation Tables

**NOTE:** All observations use the seed value of `12345`

### Metric Summary

#### 1. Summary of Varying Amount of Spells

Firstly, Nesting vs Linking gives us completely separate trends. Overall, we get more complex spells with nesting than with linking, however, this is because of how we score the two cases, not because of their intrinsic behaviors. Each nesting depth gets 4 points in raw score compared to 2 for any links (beyond the first). However, this itself gives us a huge difference in how the spells generated trend towards. Keeping that in mind, here's the trend we observed with the detailed observations below:

1. Increasing amount of spells generally gave us more valid spells than the invalid ones. The increase in validity % did plateau at one point, but overall, the bulk generator performs better when more spells are being generated. The increase is more gradual in case of linked spells (83% - 88%) than in nested spells (50% - 76%).
2. With increasing amount of spells being generated, the average uniqueness ratio falls quite a bit. This means, the same spells are being generated multiple times when the amount of spells are more. This dip in uniqueness ratio is more significant in case of linked spells, going from 1 to 0.12, which means, only 12% of the generated spells are unique. The dip is more gradual in nested spells (1 to 0.87), where only 13%V spells were repeated even with 120000 spells being generated at once.
3. Average Raw score reduces while increasing the number of spells generated. This is expected as the overall score is the same in all scenarios whereas, the number of spells are increasing.
4. Average complexity scores show a complete different trend in itself with varying normalization function used. The dip in average complexity scores for the three functions in both nested and linked spells are: Sigmoid > Exponential > Arctan.

Another observation is that Linked spells are only generating Novice tier spells in all scenarios whereas, Nested can easily generate Apprentice or even Adept tier spells in most cases. However, none of the spells generated fell under the Master tier in any of the 30 scenarios tested.

### Detailed Observations

#### 1. Varying Amount of Spells

Here, we use Max Nesting of 4 and Max Linking of 0 and vice versa

| Run / Simulation | Amount of Spells | Validity % | Average Uniqueness Ratio | Average Complexity Score | Average Raw Score | Highest Complexity Tier | Normalization | Max Nesting | Max Linking | Report |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 12 | 50 | 1.00 | 0.42 | 19.17 | Apprentice | Exponential | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_1.json) |
| 2 | 120 | 75 | 1.00 | 0.36 | 16.88 | Apprentice | Exponential | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_2.json) |
| 3 | 1200 | 76 | 0.99 | 0.33 | 15.53 | Apprentice | Exponential | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_3.json) |
| 4 | 12000 | 74 | 0.94 | 0.33 | 15.58 | Adept | Exponential | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_4.json) |
| 5 | 120000 | 74 | 0.87 | 0.33 | 15.62 | Adept | Exponential | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_5.json) |
| 6 | 12 | 50 | 1.00 | 0.54 | 19.17 | Adept | Sigmoid | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_6.json) |
| 7 | 120 | 75 | 1.00 | 0.48 | 16.88 | Adept | Sigmoid | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_6.json) |
| 8 | 1200 | 76 | 0.98 | 0.44 | 15.53 | Adept | Sigmoid | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_8.json) |
| 9 | 12000 | 74 | 0.94 | 0.44 | 15.58 | Adept | Sigmoid | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_9.json) |
| 10 | 120000 | 74 | 0.87 | 0.44 | 15.62 | Adept | Sigmoid | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_10.json) |
| 11 | 12 | 50 | 1.00 | 0.27 | 19.17 | Apprentice | Arctan | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_11.json) |
| 12 | 120 | 75 | 1.00 | 0.24 | 16.88 | Apprentice | Arctan | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_12.json) |
| 13 | 1200 | 76 | 0.99 | 0.23 | 15.53 | Apprentice | Arctan | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_13.json) |
| 14 | 12000 | 74 | 0.94 | 0.23 | 15.58 | Apprentice | Arctan | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_14.json) |
| 15 | 120000 | 74 | 0.87 | 0.23 | 15.62 | Apprentice | Arctan | 4 | 0 | [Report](./Varying%20Amount%20of%20Spells/1_15.json) |
| 16 | 12 | 83 | 1.00 | 0.08 | 5.54 | Novice | Exponential | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_16.json) |
| 17 | 120 | 82 | 0.99 | 0.07 | 5.05 | Novice | Exponential | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_17.json) |
| 18 | 1200 | 87 | 0.78 | 0.05 | 4.31 | Novice | Exponential | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_18.json) |
| 19 | 12000 | 87 | 0.47 | 0.05 | 4.26 | Novice | Exponential | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_19.json) |
| 20 | 120000 | 88 | 0.12 | 0.05 | 4.25 | Novice | Exponential | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_2-.json) |
| 21 | 12 | 83 | 1.00 | 0.18 | 5.54 | Novice | Sigmoid | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_21.json) |
| 22 | 120 | 82 | 0.99 | 0.17 | 5.05 | Novice | Sigmoid | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_22.json) |
| 23 | 1200 | 87 | 0.78 | 0.14 | 4.31 | Novice | Sigmoid | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_23.json) |
| 24 | 12000 | 87 | 0.47 | 0.14 | 4.26 | Novice | Sigmoid | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_24.json) |
| 25 | 120000 | 88 | 0.12 | 0.14 | 4.25 | Novice | Sigmoid | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_25.json) |
| 26 | 12 | 83 | 1.00 | 0.11 | 5.54 | Novice | Arctan | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_26.json) |
| 27 | 120 | 82 | 0.99 | 0.10 | 5.05 | Novice | Arctan | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_27.json) |
| 28 | 1200 | 87 | 0.78 | 0.09 | 4.31 | Novice | Arctan | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_28.json) |
| 29 | 12000 | 87 | 0.47 | 0.09 | 4.26 | Novice | Arctan | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_29.json) |
| 30 | 120000 | 88 | 0.12 | 0.09 | 4.25 | Novice | Arctan | 0 | 4 | [Report](./Varying%20Amount%20of%20Spells/1_30.json) |

#### 2. Varying Max Nesting Depth

| Run / Simulation | Max Nesting Depth | Validity % | Uniqueness Ratio | Complexity Score | Normalization |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | — | — | — | — | Exponential |
| 2 | — | — | — | — | Exponential |
| 3 | — | — | — | — | Exponential |
| 4 | — | — | — | — | Exponential |
| 5 | — | — | — | — | Exponential |
| 6 | — | — | — | — | Sigmoid |
| 7 | — | — | — | — | Sigmoid |
| 8 | — | — | — | — | Sigmoid |
| 9 | — | — | — | — | Sigmoid |
| 10 | — | — | — | — | Sigmoid |
| 11 | — | — | — | — | Arctan |
| 12 | — | — | — | — | Arctan |
| 13 | — | — | — | — | Arctan |
| 14 | — | — | — | — | Arctan |
| 15 | — | — | — | — | Arctan |

#### 3. Varying Max Linking Depth

| Run / Simulation | Max Linking Depth | Validity % | Uniqueness Ratio | Complexity Score | Normalization |
| :--- | :---: | :---: | :---: | :---: | :---: |
| 1 | — | — | — | — | Exponential |
| 2 | — | — | — | — | Exponential |
| 3 | — | — | — | — | Exponential |
| 4 | — | — | — | — | Exponential |
| 5 | — | — | — | — | Exponential |
| 6 | — | — | — | — | Sigmoid |
| 7 | — | — | — | — | Sigmoid |
| 8 | — | — | — | — | Sigmoid |
| 9 | — | — | — | — | Sigmoid |
| 10 | — | — | — | — | Sigmoid |
| 11 | — | — | — | — | Arctan |
| 12 | — | — | — | — | Arctan |
| 13 | — | — | — | — | Arctan |
| 14 | — | — | — | — | Arctan |
| 15 | — | — | — | — | Arctan |
