import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DateHeader } from "@/components/DateHeader";
import { AffirmationCard } from "@/components/AffirmationCard";
import { DDaySection } from "@/components/DDaySection";
import { TodoSection } from "@/components/TodoSection";
import { DemoBanner } from "@/components/DemoBanner";
import { useAffirmation } from "@/hooks/useAffirmation";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { Colors, Spacing } from "@/constants/theme";

export function HomeScreen() {
    useScreenTracking('screen_home');

    const {
        text: affirmationText,
        affirmations,
        addAffirmation,
        updateAffirmation,
        deleteAffirmation,
        shuffleAffirmation,
    } = useAffirmation();

    const canShuffle = affirmations.length > 1;

    const HeaderComponent = (
        <View style={styles.cardsContainer}>
            <AffirmationCard
                text={affirmationText}
                onShuffle={shuffleAffirmation}
                canShuffle={canShuffle}
            />
            <DDaySection
                affirmationText={affirmationText}
                affirmations={affirmations}
                onAddAffirmation={addAffirmation}
                onUpdateAffirmation={updateAffirmation}
                onDeleteAffirmation={deleteAffirmation}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <DemoBanner />
            <View style={styles.fixedHeader}>
                <DateHeader />
            </View>
            <TodoSection ListHeaderComponent={HeaderComponent} />
        </SafeAreaView>
    );
}

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgPrimary,
    },
    fixedHeader: {
        paddingHorizontal: Spacing['3xl'],
        paddingTop: Spacing['3xl'],
        paddingBottom: Spacing.md,
        backgroundColor: Colors.bgPrimary,
    },
    cardsContainer: {
        gap: Spacing.md,
        paddingVertical: Spacing.md,
    },
});
