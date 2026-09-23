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

1. Increasing amount of spells generally gave us more valid spells than the invalid ones. The increase in validity % did plateau at one point, but overall, the bulk generator performs better when more spells are being generated. The increase is more gradual in case of linked spells (73% - 88%) than in nested spells (67% - 77%).
2. With increasing amount of spells being generated, the average uniqueness ratio falls quite a bit. This means, the same spells are being generated multiple times when the amount of spells are more. This dip in uniqueness ratio is more significant in case of linked spells, going from 1.00 to 0.12, which means, only 12% of the generated spells are unique. The dip is more gradual in nested spells, going from 1.00 to 0.69, where only 31% of the generated spells are unique even with 120000 spells being generated at once.
3. Average Raw score remains broadly consistent across the amount-of-spells sweep, with modest fluctuations around the same range rather than a steady decline. This is expected as the overall score distribution stays relatively stable while the number of generated spells increases.
4. Average complexity scores show a completely different trend in itself with varying normalization function used. The dip in average complexity scores for the three functions in both nested and linked spells are: Sigmoid > Exponential > Arctan.

Another observation is that Linked spells are only generating Novice tier spells in all scenarios whereas, Nested can easily generate Apprentice or even Adept tier spells in most cases. However, none of the spells generated fell under the Master tier in any of the 30 scenarios tested.

#### 2. Summary of Varying Max Nesting Depth

As we increase the maximum nesting depth, the generated spells become noticeably more complex and move quickly up the tier ladder, but this comes at the cost of validity.

1. At a maximum nesting depth of 0, every normalization function produces low-complexity Novice spells with a validity of 87%, average uniqueness ratio of 0.78, and raw score of 4.31
2. As the nesting limit rises to 5, the raw score jumps to 18.35 while the validity drops to 73%, and all three variants still remain Novice-tier overall. The trend becomes much more pronounced at a depth of 10, where the average raw score reaches 38.21 and the highest complexity tier rises to Master under Sigmoid, Adept under Exponential, and Apprentice under Arctan, while validity falls to 53%.
3. This pattern continues as depth increases further: at 15, validity drops to 41% and the generator reaches Master under both Sigmoid and Exponential, while at depths 20, 25, and 30 the validity keeps falling to 34%, 27%, and 25%, respectively, with Sigmoid and Exponential consistently producing Master-tier spells and Arctan remaining in the Apprentice range.

Across all scenarios, the uniqueness ratio stays nearly flat at around 0.99–1.00, which suggests that the generator is still creating largely distinct spell patterns even as the complexity increases. The overall effect is clear: increasing max nesting depth drives a sharp rise in raw score and tier progression, but it also reduces validity and makes the normalization function a major deciding factor in how quickly spells reach the higher complexity tiers.

#### 3. Summary of Varying Max Linking Depth

As we increase the maximum linking depth, the same broad pattern appears, but it is slightly less extreme than in the nesting case. At a maximum linking depth of 0, every normalization function produces low-complexity Novice spells with a validity of 87%, average uniqueness ratio of 0.78, and raw score of 4.31. Once the linking limit rises to 5, the raw score jumps to 14.24 while validity falls to 75%, and all three variants still remain Novice-tier overall. The trend becomes much more pronounced at a depth of 10, where the average raw score reaches 29.86 and the highest complexity tier rises to Master under Sigmoid, Adept under Exponential, and Apprentice under Arctan, while validity drops to 54%.

This pattern continues as depth increases further: at 15, validity falls to 46% and the generator reaches Master under both Sigmoid and Exponential, while at depths 20, 25, and 30 the validity keeps falling to 38%, 29%, and 26%, respectively, with Sigmoid and Exponential still dominating the upper tier range and Arctan remaining in the Apprentice band. Across all scenarios, the uniqueness ratio remains extremely high at around 0.96–1.00, which shows that the generator is still producing mostly distinct spell patterns even as linked complexity rises. The overall effect is clear: increasing max linking depth pushes spells steadily upward through the tier system, but it does so by reducing validity in a way that is still somewhat less severe than the nesting case, with normalization again acting as a major driver of how quickly those higher tiers are reached.

### Detailed Observations

#### 1. Varying Amount of Spells

Here, we use Max Nesting of 4 and Max Linking of 0 and vice versa

| Run / Simulation | Amount of Spells | Validity % | Average Uniqueness Ratio | Average Complexity Score | Average Raw Score | Highest Complexity Tier | Normalization | Max Nesting | Max Linking |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 12 | 67 | 1.00 | 0.42 | 15.25 | Novice | Sigmoid | 4 | 0 |
| 2 | 120 | 77 | 0.99 | 0.46 | 16.46 | Novice | Sigmoid | 4 | 0 |
| 3 | 1200 | 77 | 0.96 | 0.40 | 13.89 | Novice | Sigmoid | 4 | 0 |
| 4 | 12000 | 76 | 0.84 | 0.40 | 14.09 | Novice | Sigmoid | 4 | 0 |
| 5 | 120000 | 76 | 0.69 | 0.40 | 14.14 | Novice | Sigmoid | 4 | 0 |
| 6 | 12 | 67 | 1.00 | 0.30 | 15.25 | Novice | Exponential | 4 | 0 |
| 7 | 120 | 77 | 0.99 | 0.34 | 16.46 | Novice | Exponential | 4 | 0 |
| 8 | 1200 | 77 | 0.96 | 0.29 | 13.89 | Novice | Exponential | 4 | 0 |
| 9 | 12000 | 76 | 0.84 | 0.29 | 14.09 | Novice | Exponential | 4 | 0 |
| 10 | 120000 | 76 | 0.69 | 0.29 | 14.14 | Novice | Exponential | 4 | 0 |
| 11 | 12 | 67 | 1.00 | 0.21 | 15.25 | Novice | Arctan | 4 | 0 |
| 12 | 120 | 77 | 0.99 | 0.23 | 16.46 | Novice | Arctan | 4 | 0 |
| 13 | 1200 | 77 | 0.96 | 0.21 | 13.89 | Novice | Arctan | 4 | 0 |
| 14 | 12000 | 76 | 0.84 | 0.21 | 14.09 | Novice | Arctan | 4 | 0 |
| 15 | 120000 | 76 | 0.69 | 0.21 | 14.14 | Novice | Arctan | 4 | 0 |
| 16 | 12 | 75 | 1.00 | 0.24 | 7.50 | Novice | Sigmoid | 0 | 4 |
| 17 | 120 | 73 | 0.99 | 0.32 | 10.75 | Novice | Sigmoid | 0 | 4 |
| 18 | 1200 | 78 | 0.94 | 0.34 | 11.30 | Novice | Sigmoid | 0 | 4 |
| 19 | 12000 | 76 | 0.84 | 0.35 | 11.76 | Novice | Sigmoid | 0 | 4 |
| 20 | 120000 | 76 | 0.69 | 0.35 | 11.73 | Novice | Sigmoid | 0 | 4 |
| 21 | 12 | 75 | 1.00 | 0.15 | 7.50 | Novice | Exponential | 0 | 4 |
| 22 | 120 | 73 | 0.99 | 0.22 | 10.75 | Novice | Exponential | 0 | 4 |
| 23 | 1200 | 78 | 0.94 | 0.24 | 11.30 | Novice | Exponential | 0 | 4 |
| 24 | 12000 | 76 | 0.84 | 0.25 | 11.76 | Novice | Exponential | 0 | 4 |
| 25 | 120000 | 76 | 0.69 | 0.25 | 11.73 | Novice | Exponential | 0 | 4 |
| 26 | 12 | 75 | 1.00 | 0.14 | 7.50 | Novice | Arctan | 0 | 4 |
| 27 | 120 | 73 | 0.99 | 0.17 | 10.75 | Novice | Arctan | 0 | 4 |
| 28 | 1200 | 78 | 0.94 | 0.18 | 11.30 | Novice | Arctan | 0 | 4 |
| 29 | 12000 | 76 | 0.84 | 0.19 | 11.76 | Novice | Arctan | 0 | 4 |
| 30 | 120000 | 76 | 0.69 | 0.19 | 11.73 | Novice | Arctan | 0 | 4 |
| 31 | 12 | 83 | 1.00 | 0.18 | 5.54 | Novice | Sigmoid | 0 | 0 |
| 32 | 120 | 82 | 0.99 | 0.17 | 5.05 | Novice | Sigmoid | 0 | 0 |
| 33 | 1200 | 87 | 0.78 | 0.14 | 4.31 | Novice | Sigmoid | 0 | 0 |
| 34 | 12000 | 87 | 0.47 | 0.14 | 4.26 | Novice | Sigmoid | 0 | 0 |
| 35 | 120000 | 88 | 0.12 | 0.14 | 4.25 | Novice | Sigmoid | 0 | 0 |
| 36 | 12 | 83 | 1.00 | 0.08 | 5.54 | Novice | Exponential | 0 | 0 |
| 37 | 120 | 82 | 0.99 | 0.07 | 5.05 | Novice | Exponential | 0 | 0 |
| 38 | 1200 | 87 | 0.78 | 0.05 | 4.31 | Novice | Exponential | 0 | 0 |
| 39 | 12000 | 87 | 0.47 | 0.05 | 4.26 | Novice | Exponential | 0 | 0 |
| 40 | 120000 | 88 | 0.12 | 0.05 | 4.25 | Novice | Exponential | 0 | 0 |
| 41 | 12 | 83 | 1.00 | 0.11 | 5.54 | Novice | Arctan | 0 | 0 |
| 42 | 120 | 82 | 0.99 | 0.10 | 5.05 | Novice | Arctan | 0 | 0 |
| 43 | 1200 | 87 | 0.78 | 0.09 | 4.31 | Novice | Arctan | 0 | 0 |
| 44 | 12000 | 87 | 0.47 | 0.09 | 4.26 | Novice | Arctan | 0 | 0 |
| 45 | 120000 | 88 | 0.12 | 0.09 | 4.25 | Novice | Arctan | 0 | 0 |

#### 2. Varying Max Nesting Depth

| Run / Simulation | Amount of Spells | Validity % | Average Uniqueness Ratio | Average Complexity Score | Average Raw Score | Highest Complexity Tier | Normalization | Max Nesting | Max Linking |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 1200 | 87 | 0.78 | 0.14 | 4.31 | Novice | Sigmoid | 0 | 0 |
| 2 | 1200 | 87 | 0.78 | 0.05 | 4.31 | Novice | Exponential | 0 | 0 |
| 3 | 1200 | 87 | 0.78 | 0.09 | 4.31 | Novice | Arctan | 0 | 0 |
| 4 | 1200 | 73 | 0.97 | 0.48 | 18.35 | Novice | Sigmoid | 5 | 0 |
| 5 | 1200 | 73 | 0.97 | 0.36 | 18.35 | Novice | Exponential | 5 | 0 |
| 6 | 1200 | 73 | 0.97 | 0.24 | 18.35 | Novice | Arctan | 5 | 0 |
| 7 | 1200 | 53 | 0.99 | 0.69 | 38.21 | Master | Sigmoid | 10 | 0 |
| 8 | 1200 | 53 | 0.99 | 0.55 | 38.21 | Adept | Exponential | 10 | 0 |
| 9 | 1200 | 53 | 0.99 | 0.32 | 38.21 | Apprentice | Arctan | 10 | 0 |
| 10 | 1200 | 41 | 0.99 | 0.80 | 60.28 | Master | Sigmoid | 15 | 0 |
| 11 | 1200 | 41 | 0.99 | 0.66 | 60.28 | Master | Exponential | 15 | 0 |
| 12 | 1200 | 41 | 0.99 | 0.37 | 60.28 | Apprentice | Arctan | 15 | 0 |
| 13 | 1200 | 34 | 1.00 | 0.86 | 80.29 | Master | Sigmoid | 20 | 0 |
| 14 | 1200 | 34 | 1.00 | 0.72 | 80.29 | Master | Exponential | 20 | 0 |
| 15 | 1200 | 34 | 1.00 | 0.39 | 80.29 | Apprentice | Arctan | 20 | 0 |
| 16 | 1200 | 27 | 1.00 | 0.87 | 101.85 | Master | Sigmoid | 25 | 0 |
| 17 | 1200 | 27 | 1.00 | 0.75 | 101.85 | Master | Exponential | 25 | 0 |
| 18 | 1200 | 27 | 1.00 | 0.41 | 101.85 | Apprentice | Arctan | 25 | 0 |
| 19 | 1200 | 25 | 1.00 | 0.89 | 119.61 | Master | Sigmoid | 30 | 0 |
| 20 | 1200 | 25 | 1.00 | 0.77 | 119.61 | Master | Exponential | 30 | 0 |
| 21 | 1200 | 25 | 1.00 | 0.41 | 119.61 | Apprentice | Arctan | 30 | 0 |

#### 3. Varying Max Linking Depth

| Run / Simulation | Amount of Spells | Validity % | Average Uniqueness Ratio | Average Complexity Score | Average Raw Score | Highest Complexity Tier | Normalization | Max Nesting | Max Linking |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | 1200 | 87 | 0.78 | 0.14 | 4.31 | Novice | Sigmoid | 0 | 0 |
| 2 | 1200 | 87 | 0.78 | 0.05 | 4.31 | Novice | Exponential | 0 | 0 |
| 3 | 1200 | 87 | 0.78 | 0.09 | 4.31 | Novice | Arctan | 0 | 0 |
| 4 | 1200 | 75 | 0.96 | 0.41 | 14.24 | Novice | Sigmoid | 0 | 5 |
| 5 | 1200 | 75 | 0.96 | 0.30 | 14.24 | Novice | Exponential | 0 | 5 |
| 6 | 1200 | 75 | 0.96 | 0.21 | 14.24 | Novice | Arctan | 0 | 5 |
| 7 | 1200 | 54 | 0.99 | 0.64 | 29.86 | Master | Sigmoid | 0 | 10 |
| 8 | 1200 | 54 | 0.99 | 0.50 | 29.86 | Adept | Exponential | 0 | 10 |
| 9 | 1200 | 54 | 0.99 | 0.30 | 29.86 | Apprentice | Arctan | 0 | 10 |
| 10 | 1200 | 46 | 0.99 | 0.74 | 45.42 | Master | Sigmoid | 0 | 15 |
| 11 | 1200 | 46 | 0.99 | 0.59 | 45.42 | Master | Exponential | 0 | 15 |
| 12 | 1200 | 46 | 0.99 | 0.34 | 45.42 | Apprentice | Arctan | 0 | 15 |
| 13 | 1200 | 38 | 1.00 | 0.79 | 59.99 | Master | Sigmoid | 0 | 20 |
| 14 | 1200 | 38 | 1.00 | 0.65 | 59.99 | Master | Exponential | 0 | 20 |
| 15 | 1200 | 38 | 1.00 | 0.36 | 59.99 | Apprentice | Arctan | 0 | 20 |
| 16 | 1200 | 29 | 1.00 | 0.84 | 75.53 | Master | Sigmoid | 0 | 25 |
| 17 | 1200 | 29 | 1.00 | 0.71 | 75.53 | Master | Exponential | 0 | 25 |
| 18 | 1200 | 29 | 1.00 | 0.39 | 75.53 | Apprentice | Arctan | 0 | 25 |
| 19 | 1200 | 26 | 1.00 | 0.86 | 90.87 | Master | Sigmoid | 0 | 30 |
| 20 | 1200 | 26 | 1.00 | 0.73 | 90.87 | Master | Exponential | 0 | 30 |
| 21 | 1200 | 26 | 1.00 | 0.40 | 90.87 | Apprentice | Arctan | 0 | 30 |
