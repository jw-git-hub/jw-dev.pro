/**
 * Stylelint. За основу взят stylelint-config-standard; каждое отступление
 * объяснено — иначе через месяц никто не вспомнит, почему правило выключено.
 */
export default {
  extends: 'stylelint-config-standard',
  ignoreFiles: ['dist/**/*.css', 'node_modules/**'],
  rules: {
    // Имена классов и переменных заданы DESIGN-GUIDE: `.g`, `.gd`, `.rv`, `--acc`,
    // `--ink2`. Гайд — контракт с макетом, переименовывать под шаблон нельзя.
    'custom-property-pattern': null,
    'selector-class-pattern': null,
    'keyframes-name-pattern': null,

    // Порядок правил в файлах смысловой (сначала базовое состояние, потом
    // модификаторы и состояния), и он важнее алфавита специфичности.
    'no-descending-specificity': null,

    // Шорткаты вроде `padding: 5px 11px` короче и читаются лучше развёрнутых.
    'declaration-block-no-redundant-longhand-properties': null,

    // Значения переносятся из макета один в один: спор о `.045` против `4.5%`
    // и `#FFF` против `#ffffff` не стоит расхождения с эталоном.
    'alpha-value-notation': null,
    'color-function-notation': null,
    'color-hex-length': null,
    'value-keyword-case': null,

    // `(max-width: 900px)` вместо `(width <= 900px)`: диапазонный синтаксис
    // ещё не везде поддержан, а автопрефиксера в сборке нет.
    'media-feature-range-notation': 'prefix',

    // Опечатка в значении свойства должна валить линтер, а не всплывать в браузере.
    'declaration-property-value-no-unknown': true,

    // Autoprefixer в пайплайне нет — префиксы пишутся руками и обязаны остаться:
    // iOS понимает только `-webkit-text-size-adjust`, Safari до 18 —
    // только `-webkit-backdrop-filter`, маска рамки `.irid` без
    // `-webkit-mask-composite: xor` в WebKit не собирается вовсе.
    'property-no-vendor-prefix': null,
    'value-no-vendor-prefix': null,

    // `@import './base.css'` — форму со строкой Vite надёжно склеивает на сборке,
    // `url()` он вправе счесть внешним ресурсом и оставить запросом в рантайме.
    'import-notation': 'string',
  },
};
