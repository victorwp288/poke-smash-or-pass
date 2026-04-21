import { useLocale } from "@/app/providers/LocaleProvider";
import type { PokemonFormOption } from "@/lib/pokeapi/types";
import {
  Box,
  Stack,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import React from "react";

type FormRailProps = {
  forms: PokemonFormOption[];
  activeFormKey: string | null;
  loading?: boolean;
  onSelectForm: (form: PokemonFormOption) => void;
};

const stopPointer = (
  event:
    | React.MouseEvent<HTMLElement>
    | React.PointerEvent<HTMLElement>
    | React.TouchEvent<HTMLElement>
) => {
  event.stopPropagation();
};

export const FormRail = ({
  forms,
  activeFormKey,
  onSelectForm
}: FormRailProps) => {
  const { strings } = useLocale();
  const theme = useTheme();

  if (forms.length <= 1) return null;

  return (
    <Stack
      spacing={0.85}
      data-card-swipe-ignore="true"
      sx={{ minWidth: 0, width: "100%" }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: 1.1, textTransform: "uppercase" }}
        >
          {strings.card.forms}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {forms.length}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: "auto",
          pb: 0.5,
          pr: 0.25
        }}
      >
        {forms.map((form) => {
          const isActive = activeFormKey
            ? activeFormKey === form.requestKey
            : form.isDefault;
          const accent = form.typeNames[0]
            ? alpha(theme.palette.text.primary, 0.14)
            : alpha(theme.palette.text.primary, 0.1);

          return (
            <Box
              key={form.requestKey}
              component="button"
              type="button"
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                stopPointer(event);
                onSelectForm(form);
              }}
              onPointerDown={stopPointer}
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 1,
                minWidth: 124,
                padding: 0.85,
                border: "1px solid",
                borderColor: isActive
                  ? "secondary.main"
                  : alpha(theme.palette.text.primary, 0.12),
                borderRadius: 0,
                bgcolor: isActive
                  ? alpha(theme.palette.secondary.main, 0.12)
                  : "background.paper",
                textAlign: "left",
                cursor: "pointer",
                transition:
                  "border-color 180ms ease, background-color 180ms ease, transform 180ms ease",
                "&:hover": {
                  borderColor: isActive
                    ? "secondary.main"
                    : alpha(theme.palette.text.primary, 0.28),
                  transform: "translateY(-1px)"
                }
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  insetInline: 0,
                  top: 0,
                  height: 3,
                  bgcolor: isActive ? "secondary.main" : accent
                }}
              />
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: alpha(theme.palette.background.default, 0.9)
                }}
              >
                {form.thumb ? (
                  <Box
                    component="img"
                    src={form.thumb}
                    alt={form.label}
                    sx={{
                      width: 34,
                      height: 34,
                      objectFit: "contain"
                    }}
                  />
                ) : null}
              </Box>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", letterSpacing: 0.8 }}
                >
                  {form.isDefault
                    ? strings.card.defaultForm
                    : strings.card.altForm}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={isActive ? 800 : 700}
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {form.shortLabel}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};
