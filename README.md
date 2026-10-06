# Smallpox Learn

A source-linked companion to [Measles Learn](https://github.com/RFNajera/measles-learn), built for René F. Najera, DrPH. Eight lessons, 24 questions with explanations, 12 timeline milestones, light/dark mode, and device-local progress. Original chapter illustrations use SVG; no graphic clinical photographs.

## Lessons
1. Origins & early prevention
2. The virus & transmission
3. Illness & lasting harm
4. The first vaccine
5. How eradication worked
6. The last natural case: Somalia, 1977
7. Vaccines & preparedness today
8. Myths & careful comparisons

## Run locally
```sh
python3 -m http.server 8000
```
Open http://localhost:8000. Plain HTML/CSS/JavaScript; no dependency installation or build step. Content is in `js/data.js`. `sources.html` is a printable reference handout. Content reviewed 6 October 2026.

## Publish on GitHub Pages
Create `RFNajera/smallpox-learn`, push these files to `main`, then select **Settings → Pages → Source → GitHub Actions**. The included workflow deploys only public site files. The expected default URL after deployment is `https://rfnajera.github.io/smallpox-learn/`; it is not a confirmed live URL until deployment succeeds. No custom domain is assumed.

## Content standards
Each factual lesson paragraph and each timeline item links supporting sources. Quizzes derive from the lessons. Historical uncertainty, case-fatality differences, certification dates, and vaccine-specific safety are distinguished. Reflection questions are educational prompts, not evidence claims. This site provides education, not diagnosis or individual vaccination advice.

## Extending the collection
For another disease, reuse the app shell, replace MODULES/QUIZZES/TIMELINE, supply original illustrations, change metadata, and use distinct localStorage keys. Verify all content against sources rather than swapping disease names in prose.

## License
MIT. Adapted from RFNajera/measles-learn; original attribution retained in LICENSE.
