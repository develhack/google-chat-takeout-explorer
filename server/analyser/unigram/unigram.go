package unigram

import (
	"github.com/blevesearch/bleve/v2/analysis"
	"github.com/blevesearch/bleve/v2/analysis/lang/cjk"
	"github.com/blevesearch/bleve/v2/analysis/token/lowercase"
	"github.com/blevesearch/bleve/v2/analysis/tokenizer/unicode"
	"github.com/blevesearch/bleve/v2/registry"
)

const AnalyzerName = "unigram"

const FilterName = "unigram_filter"

func FilterConstructor(config map[string]interface{}, cache *registry.Cache) (analysis.TokenFilter, error) {
	return cjk.NewCJKBigramFilter(true), nil
}

func AnalyzerConstructor(config map[string]interface{}, cache *registry.Cache) (analysis.Analyzer, error) {
	tokenizer, err := cache.TokenizerNamed(unicode.Name)
	if err != nil {
		return nil, err
	}
	widthFilter, err := cache.TokenFilterNamed(cjk.WidthName)
	if err != nil {
		return nil, err
	}
	toLowerFilter, err := cache.TokenFilterNamed(lowercase.Name)
	if err != nil {
		return nil, err
	}
	unigramFilter, err := cache.TokenFilterNamed(FilterName)
	if err != nil {
		return nil, err
	}
	rv := analysis.DefaultAnalyzer{
		Tokenizer: tokenizer,
		TokenFilters: []analysis.TokenFilter{
			widthFilter,
			toLowerFilter,
			unigramFilter,
		},
	}
	return &rv, nil
}

func init() {
	if err := registry.RegisterTokenFilter(FilterName, FilterConstructor); err != nil {
		panic(err)
	}
	if err := registry.RegisterAnalyzer(AnalyzerName, AnalyzerConstructor); err != nil {
		panic(err)
	}
}
