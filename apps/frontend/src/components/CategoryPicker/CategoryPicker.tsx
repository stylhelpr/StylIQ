import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import categories from '../../assets/data/categories.json';
import {MainCategory, Subcategory} from '../../types/categoryTypes';

type Props = {
  selectedMainCategory: MainCategory | null;
  selectedSubcategory: Subcategory | null;
  onSelect: (main: MainCategory, sub: Subcategory) => void;
};

export default function CategoryPicker({
  selectedMainCategory,
  selectedSubcategory,
  onSelect,
}: Props) {
  const [openCategory, setOpenCategory] = useState<MainCategory | null>(null);

  return (
    <View style={styles.container}>
      <ScrollView>
        {Object.entries(categories).map(([main, subs]) => {
          const mainCat = main as MainCategory;
          const isOpen = openCategory === mainCat;

          return (
            <View key={mainCat} style={styles.section}>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={() => setOpenCategory(isOpen ? null : mainCat)}>
                <Text style={styles.mainText}>
                  {mainCat} {isOpen ? '−' : '+'}
                </Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.subList}>
                  {(subs as string[]).map(sub => (
                    <TouchableOpacity
                      key={sub}
                      onPress={() => onSelect(mainCat, sub as Subcategory)}
                      style={[
                        styles.subButton,
                        selectedSubcategory === sub && styles.selectedSub,
                      ]}>
                      <Text style={styles.subText}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  mainButton: {
    padding: 12,
    backgroundColor: '#EEE',
    borderRadius: 8,
  },
  mainText: {
    fontWeight: '600',
    fontSize: 16,
  },
  subList: {
    paddingLeft: 12,
    paddingTop: 8,
  },
  subButton: {
    paddingVertical: 8,
  },
  selectedSub: {
    backgroundColor: '#D0E8FF',
    borderRadius: 6,
  },
  subText: {
    fontSize: 15,
  },
});
