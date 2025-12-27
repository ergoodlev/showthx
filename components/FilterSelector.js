/**
 * FilterSelector Component
 * Displays video filters in categorized tabs for selection
 * Filters are applied to videos during compositing via FFmpeg
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { VIDEO_FILTERS, getFilterCategories, getFiltersForCategory } from '../services/videoFilterService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FILTER_SIZE = (SCREEN_WIDTH - 60) / 4; // 4 filters per row with spacing

/**
 * FilterSelector - Shows filter categories and filter options
 * @param {string} selectedFilter - Currently selected filter ID
 * @param {function} onFilterSelect - Callback when filter is selected
 * @param {object} style - Additional container styles
 */
export const FilterSelector = ({ selectedFilter, onFilterSelect, style }) => {
  const [activeCategory, setActiveCategory] = useState('color');
  const categories = getFilterCategories();

  const handleFilterPress = (filter) => {
    // Toggle off if same filter selected
    if (selectedFilter === filter.id) {
      onFilterSelect(null);
    } else {
      onFilterSelect(filter.id);
    }
  };

  const renderCategoryTab = (category) => {
    const isActive = activeCategory === category;
    const categoryData = VIDEO_FILTERS[category];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryTab, isActive && styles.categoryTabActive]}
        onPress={() => setActiveCategory(category)}
      >
        <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFilter = (filter) => {
    const isSelected = selectedFilter === filter.id;

    return (
      <TouchableOpacity
        key={filter.id}
        style={[styles.filterItem, isSelected && styles.filterItemSelected]}
        onPress={() => handleFilterPress(filter)}
      >
        <View style={[styles.filterIconContainer, isSelected && styles.filterIconContainerSelected]}>
          <Text style={styles.filterIcon}>{filter.icon}</Text>
        </View>
        <Text style={[styles.filterName, isSelected && styles.filterNameSelected]} numberOfLines={1}>
          {filter.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const filters = getFiltersForCategory(activeCategory);

  return (
    <View style={[styles.container, style]}>
      {/* Category Tabs */}
      <View style={styles.categoryTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}
        >
          {categories.map(renderCategoryTab)}
        </ScrollView>
      </View>

      {/* Filter Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterGrid}
      >
        {/* "None" option to clear filter */}
        <TouchableOpacity
          style={[styles.filterItem, !selectedFilter && styles.filterItemSelected]}
          onPress={() => onFilterSelect(null)}
        >
          <View style={[styles.filterIconContainer, !selectedFilter && styles.filterIconContainerSelected]}>
            <Text style={styles.filterIcon}>✕</Text>
          </View>
          <Text style={[styles.filterName, !selectedFilter && styles.filterNameSelected]}>
            None
          </Text>
        </TouchableOpacity>

        {filters.map(renderFilter)}
      </ScrollView>

      {/* Filter Description */}
      {selectedFilter && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {filters.find(f => f.id === selectedFilter)?.description || ''}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Compact FilterSelector for inline use
 * Shows only icons in a single row
 */
export const FilterSelectorCompact = ({ selectedFilter, onFilterSelect, category = 'color' }) => {
  const filters = getFiltersForCategory(category);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.compactContainer}
    >
      {/* None option */}
      <TouchableOpacity
        style={[styles.compactItem, !selectedFilter && styles.compactItemSelected]}
        onPress={() => onFilterSelect(null)}
      >
        <Text style={styles.compactIcon}>✕</Text>
      </TouchableOpacity>

      {filters.map(filter => (
        <TouchableOpacity
          key={filter.id}
          style={[styles.compactItem, selectedFilter === filter.id && styles.compactItemSelected]}
          onPress={() => onFilterSelect(selectedFilter === filter.id ? null : filter.id)}
        >
          <Text style={styles.compactIcon}>{filter.icon}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    paddingVertical: 12,
  },
  categoryTabsContainer: {
    marginBottom: 12,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryTabActive: {
    backgroundColor: '#06B6D4',
  },
  categoryTabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  filterGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 12,
    width: FILTER_SIZE,
  },
  filterItemSelected: {},
  filterIconContainer: {
    width: FILTER_SIZE - 8,
    height: FILTER_SIZE - 8,
    borderRadius: (FILTER_SIZE - 8) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterIconContainerSelected: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  filterIcon: {
    fontSize: 28,
  },
  filterName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterNameSelected: {
    color: '#06B6D4',
    fontWeight: '700',
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  compactItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactItemSelected: {
    borderColor: '#06B6D4',
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  compactIcon: {
    fontSize: 22,
  },
});

export default FilterSelector;
