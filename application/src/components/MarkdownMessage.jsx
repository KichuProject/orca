import React from 'react';
import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

export function MarkdownMessage({ content, style }) {
  if (!content) return null;

  return (
    <View style={[styles.container, style]}>
      <Markdown style={markdownStyles}>
        {content}
      </Markdown>
    </View>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: typography.sizes.sm + 1,
    lineHeight: typography.lineHeights.base,
    fontFamily: typography.fontFamily,
  },
  heading1: {
    color: colors.textHeading,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 4,
  },
  heading2: {
    color: colors.accent,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginTop: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  heading3: {
    color: colors.primaryLight,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  strong: {
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
  },
  em: {
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  bullet_list: {
    marginVertical: spacing.xs,
  },
  ordered_list: {
    marginVertical: spacing.xs,
  },
  list_item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    marginRight: 6,
    lineHeight: typography.lineHeights.base,
  },
  ordered_list_icon: {
    color: colors.primaryLight,
    fontSize: typography.sizes.xs,
    marginRight: 6,
    lineHeight: typography.lineHeights.base,
  },
  code_inline: {
    backgroundColor: colors.surfaceElevated,
    color: colors.accent,
    fontFamily: typography.monoFontFamily,
    fontSize: typography.sizes.xs + 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  code_block: {
    backgroundColor: colors.background,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: spacing.radius.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    fontFamily: typography.monoFontFamily,
    color: colors.primaryLight,
  },
  fence: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radius.sm,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.sm,
    marginVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
  },
  thead: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: {
    padding: 6,
    fontWeight: typography.weights.bold,
    color: colors.textHeading,
    fontSize: typography.sizes.xs,
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
  },
  td: {
    padding: 6,
    color: colors.text,
    fontSize: typography.sizes.xs,
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: colors.surfaceElevated,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  hr: {
    backgroundColor: colors.borderSubtle,
    height: 1,
    marginVertical: spacing.sm,
  },
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default MarkdownMessage;
