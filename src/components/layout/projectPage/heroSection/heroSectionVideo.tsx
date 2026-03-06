import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
} from "@heroui/react";
import Video from 'next-video';

export default function HeroSectionVideo({ video, isOpen, onClose }: { video: string; isOpen: boolean; onClose: () => void }) {
    return (
        <>
            <Modal backdrop={"blur"} size="5xl" isOpen={isOpen} onClose={onClose}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalBody className="!p-0">
                                <Video
                                    src={video}
                                    className="w-full h-full"
                                    controls
                                    autoPlay={true}
                                    muted={false}
                                    loop={true}
                                />
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    )
}