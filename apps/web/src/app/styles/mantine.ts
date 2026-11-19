/*
 * Only the Mantine styles the app renders, instead of the full @mantine/core/styles.css (~250 KB).
 * Order matters: base styles first, then dependencies before the components that use them.
 * When adding a Mantine component, add its stylesheet here.
 */
import '@mantine/core/styles/baseline.css'
import '@mantine/core/styles/default-css-variables.css'
import '@mantine/core/styles/global.css'

import '@mantine/core/styles/UnstyledButton.css'
import '@mantine/core/styles/VisuallyHidden.css'
import '@mantine/core/styles/Paper.css'
import '@mantine/core/styles/ScrollArea.css'
import '@mantine/core/styles/Text.css'
import '@mantine/core/styles/Title.css'
import '@mantine/core/styles/Container.css'
import '@mantine/core/styles/Stack.css'
import '@mantine/core/styles/Group.css'
import '@mantine/core/styles/Center.css'
import '@mantine/core/styles/SimpleGrid.css'
import '@mantine/core/styles/AspectRatio.css'
import '@mantine/core/styles/Divider.css'
import '@mantine/core/styles/Image.css'
import '@mantine/core/styles/Loader.css'
import '@mantine/core/styles/Overlay.css'
import '@mantine/core/styles/CloseButton.css'
import '@mantine/core/styles/ModalBase.css'
import '@mantine/core/styles/Modal.css'
import '@mantine/core/styles/Input.css'
import '@mantine/core/styles/InlineInput.css'
import '@mantine/core/styles/Checkbox.css'
import '@mantine/core/styles/Button.css'
import '@mantine/core/styles/Alert.css'
import '@mantine/core/styles/Skeleton.css'
import '@mantine/core/styles/Progress.css'

import './pointer-hover.css'
