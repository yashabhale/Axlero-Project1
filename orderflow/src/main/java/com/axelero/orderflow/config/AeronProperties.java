package com.axelero.orderflow.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "orderflow.aeron")
public class AeronProperties {
    private String channel = "aeron:ipc";
    private int streamId = 1001;
    private String directoryName;
    private boolean embeddedDriver = true;

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public int getStreamId() { return streamId; }
    public void setStreamId(int streamId) { this.streamId = streamId; }

    public String getDirectoryName() { return directoryName; }
    public void setDirectoryName(String directoryName) { this.directoryName = directoryName; }

    public boolean isEmbeddedDriver() { return embeddedDriver; }
    public void setEmbeddedDriver(boolean embeddedDriver) { this.embeddedDriver = embeddedDriver; }
}
